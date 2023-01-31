import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

export interface eksClusterOptions {
    name: string;
    version: string;
    vpcId?: string;
    privateSubnetsIds?: string[];
    publicSubnetIds?: string[];
}

export class eksCluster extends pulumi.ComponentResource {

    private eksCluster: eks.Cluster;
    private eksClusterOptions: eksClusterOptions;
    private nodePolicies: string[] = [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy", 
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    ];

    constructor(name: string, eksClusterOptions: eksClusterOptions, opts?: pulumi.ResourceOptions){
        super("modules:eksCluster", name, opts);

        this.eksClusterOptions = eksClusterOptions

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
            parent: this
        });

        // Attaching roles to the control plane role
        const controlPlaneRoleAttachment = new aws.iam.RolePolicyAttachment("controlPlaneRoleAttachment", {
            role: controlPlaneRole.name,
            policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
        }, { parent: this });

        // Creating the nodes role
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
            parent: this
        })

        // Attaching policies to the node roles
        for (const [i, policy] of this.nodePolicies.entries()){
            const nodeRoleAttachment = new aws.iam.RolePolicyAttachment(`nodeRoleAttachment-${i}`, {
                role: nodeRole.name,
                policyArn: policy,
            }, { parent: this });
        }

        // Creating the node instance profile
        const nodeInstanceProfile = new aws.iam.InstanceProfile("nodeInstanceProfile", {role: nodeRole.name});
        
        // Creating the cluster control plane
        this.eksCluster = new eks.Cluster("eksCluster", {
            // Global configurations
            name: this.eksClusterOptions.name,
            version: this.eksClusterOptions.version,
            instanceRoles: [controlPlaneRole, nodeRole],

            // Node configuration
            nodeGroupOptions: {
                // Instance profile
                instanceProfile: nodeInstanceProfile,

                // Default Node-Pool sizing
                desiredCapacity: 6,
                maxSize: 8,
                minSize: 4,

                // Compute configuration
                instanceType: "t2.medium",
                nodeRootVolumeSize: 20,

                // No public IP
                nodeAssociatePublicIpAddress: false,
            },
            
            // Networking
            vpcId: this.eksClusterOptions.vpcId,
            privateSubnetIds: this.eksClusterOptions.privateSubnetsIds ? this.eksClusterOptions.privateSubnetsIds : [],
            publicSubnetIds: this.eksClusterOptions.publicSubnetIds ? this.eksClusterOptions.publicSubnetIds: [],

            // Default configuration:
            useDefaultVpcCni: true,

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
        }, { parent: this });
    }

}