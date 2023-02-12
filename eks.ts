import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

export interface eksClusterOptions {
    name: string;
    version: string;
    vpcId?: string;
    privateSubnetsIds?: string[];
    publicSubnetIds?: string[];
    deployDefaultNodeGroup?: boolean;
}

export class eksCluster extends pulumi.ComponentResource {

    private eksCluster: eks.Cluster;
    private eksClusterOptions: eksClusterOptions;

    constructor(name: string, eksClusterOptions: eksClusterOptions, opts?: pulumi.ResourceOptions){
        super("modules:eksCluster", name, opts);

        // Getting the values from the constructor parameter
        this.eksClusterOptions = eksClusterOptions;

        // Getting IAM for the cluster done
        const controlPlaneRole: aws.iam.Role = this.createControlPlaneRole();
        const nodeRole = this.createNodeRole();

        // Setting the default ControlPlane values
        let eksClusterValues = {
            // Global configurations
            name: this.eksClusterOptions.name,
            version: this.eksClusterOptions.version,

            // ControlPlane IAM definition
            serviceRole: controlPlaneRole,
            instanceRole: nodeRole,

            // Networking
            vpcId: this.eksClusterOptions.vpcId,
            privateSubnetIds: this.eksClusterOptions.privateSubnetsIds ? this.eksClusterOptions.privateSubnetsIds : [],
            publicSubnetIds: this.eksClusterOptions.publicSubnetIds ? this.eksClusterOptions.publicSubnetIds: [],

            // Default configuration:
            useDefaultVpcCni: true,

            // Logging configuration for the cluster
            enabledClusterLogTypes: [
                "api",
                "audit",
                "authenticator",
                "controllerManager",
                "scheduler"
            ],

            // Role Mapping
            roleMappings: [{
                groups: ["system:masters"],
                roleArn: "arn:aws:iam::851706628945:role/CrossRoleDevOpsEngineers",
                username: "ramon"
            }],

            // Tagging
            clusterTags: {
                "created-by": "pulumi",
                "usage": "eks-control-plane"
            },
        };

        // Adding defaultNodeGroups
        if (this.eksClusterOptions.deployDefaultNodeGroup) {
            eksClusterValues = Object.assign({}, eksClusterValues, {
            // Node configuration
                nodeGroupOptions: {
                    // Default Node-Pool sizing
                    desiredCapacity: 6,
                    maxSize: 8,
                    minSize: 4,

                    // Compute configuration
                    instanceType: "t2.medium",
                    nodeRootVolumeSize: 20,

                    // No public IP
                    nodeAssociatePublicIpAddress: false,
                }
            });
        } else {
            eksClusterValues = Object.assign({}, eksClusterValues, {
                skipDefaultNodeGroup: true
            });
        }

        // Creating the cluster control plane
        this.eksCluster = new eks.Cluster("eksCluster", eksClusterValues, { parent: this });

        // Creating the managedNodeGroup
        this.createManagedNodeGroups(nodeRole.arn);
    }

    // Create kubernetes Managed Nodegroups
    private createManagedNodeGroups(nodeRoleArn: pulumi.Output<string> ) {
        const managedNodeGroup = new eks.ManagedNodeGroup("eksManageNodeGroup", {
            
            // General information about the nodeType
            cluster: this.eksCluster,
            version: this.eksClusterOptions.version,
            nodeGroupName: "eksCluster-NodeGroup",
            
            // Hardware definition and availability
            capacityType: "ON_DEMAND",
            instanceTypes: [ "t3.medium", "t2.medium" ],
            diskSize: 10,

            // Scalability
            scalingConfig: {
                desiredSize: 1,
                minSize: 1,
                maxSize: 10
            },

            // Network definiton
            subnetIds: this.eksClusterOptions.privateSubnetsIds,

            // IAM Definition
            nodeRoleArn: nodeRoleArn,

        }, { parent: this.eksCluster} )
    }

    // Creates the role for the control plane
    private createControlPlaneRole(): aws.iam.Role {
        // Creating the control plane role
        const controlPlaneRole = new aws.iam.Role("controlPlaneRole", {
            name: "controlPlaneRole",
            assumeRolePolicy: JSON.stringify({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "eks.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }],
            }),
            tags: {
                "created-by": "pulumi",
                "usage": "eks-control-plane"
            }
        }, {
            parent: this.eksCluster
        });

        // Attaching roles to the control plane role
        const controlPlaneRoleAttachment = new aws.iam.RolePolicyAttachment("controlPlaneRoleAttachment", {
            role: controlPlaneRole.name,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
        }, { parent: controlPlaneRole });

        // Returning the created role
        return controlPlaneRole;
    }

    // Created the nodes for the node groups
    private createNodeRole(): aws.iam.Role {
        const nodePolicies: string[] = [
            "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
            "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
        ];

        // Creating node role
        const nodeRole = new aws.iam.Role("nodeRoles", {
            name: "nodeRole",
            assumeRolePolicy: JSON.stringify({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ec2.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }),
            tags: {
                "created-by": "pulumi",
                "usage": "eks-control-plane"
            }
        }, {
            parent: this.eksCluster
        })

        // Attaching policies to the node roles
        for (const [i, policy] of nodePolicies.entries()){
            const nodeRoleAttachment = new aws.iam.RolePolicyAttachment(`nodeRoleAttachment-${i}`, {
                role: nodeRole.name,
                policyArn: policy,
            }, { parent: nodeRole });
        }

        return nodeRole
    }

}