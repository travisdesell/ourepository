<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="projects")
 */
class Project
{


    /** @ORM\Id 
     * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */
    protected $id;

    /** @ORM\Column(type="string") */
    protected $mosaics;

    /** @ORM\Column(type="proj_acl") */
    protected $proj_acl;

    /** @ORM\Column(type="boolean") */
    protected $organization;

    /** @ORM\Column(type="boolean") */
    protected $owners;



    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setName($name)
    {
        $this->name = $name;
    }
}